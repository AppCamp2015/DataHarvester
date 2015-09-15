namespace :citydata do
	desc "Generate Data for a country"
	task generate_country_latlong: :environment do
	print 'Running task \n'
  	require 'json'
  	require 'csv'
  	require 'pry'
  	
  	def Generate10MileLatLongBoundingBox(cityObject)

		latitude = cityObject["Latitude"].to_f
		longitude = cityObject["Longitude"].to_f
		roughFactor = 0.005
		minLat = latitude - roughFactor
		maxLat = latitude + roughFactor
		minLong = longitude - roughFactor
		maxLong = longitude + roughFactor
		positionObject = {"minLat" => minLat, "maxLat" => maxLat, "minLong" => minLong, "maxLong" => maxLong, "lat" => latitude, "long" => longitude, "Altitude" => cityObject["Altitude"]} 
		# binding.pry
	end

  	country = CGI::escape(ENV['COUNTRY']) ? CGI::escape(ENV['COUNTRY']) : 'Italy'
  	puts 'Running task for '+ country +'\n'
	csvObject = CSV.read("#{Rails.root}/public/cities.csv")
	countryCsvObject = csvObject.select {|csvLine| csvLine[1] == country}
	columns = csvObject.first

	mappedArray = []

	countryCsvObject.each.with_index do |city,index|
		mappedArray[index] = city.map.with_index{|field,index| [columns[index],field]}
	end

	objectArray =[]

	mappedArray.each.with_index do |city,index|
		cityHash = city.inject({}) do |result,element|
			result[element.first.to_s] = element.last
  			result
		end
		objectArray[index] = cityHash
	end

	objectArray.each.with_index do |city,index|
		objectArray[index]['position'] =  Generate10MileLatLongBoundingBox(city)
	end

	puts objectArray.first(10)

	puts "Writing to country JSON file"
	binding.pry
	# create a has from each mapped array and create an array of objects.
	f = File.new(country+".json","w")
	f.write(JSON.pretty_generate(objectArray))
	f.close

end
end
